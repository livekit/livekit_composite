use strict;
use Cwd qw(cwd);
use Term::ANSIColor;

my %target = (
    "peer_demo"      => [qw/esp32 esp32s3 esp32s2/],
    "doorbell_demo"  => [qw/esp32p4 esp32s3/],
    "openai_demo"    => [qw/esp32s3/],
    "videocall_demo" => [qw/esp32p4/],
    "whip_demo"      => [qw/esp32p4/],
    "doorbell_local" => [qw/esp32p4/]
);

my $cur = cwd();
my ($app_folder, $target);
my $build_all = 0;
if (@ARGV >= 2) {
    $app_folder = $ARGV[0];
    $target = $ARGV[1];
    build_target($app_folder, $target);
} else {
    $build_all = 1;
    for my $t(keys %target) {
        my @board = @{$target{$t}};
        print "Start build for $t @board\n";
        for (@board) {
            build_target("$cur/$t", $_);
        }
    }
}

sub filter_build {
    my $target = shift;
    my $build_cmd = "idf.py set-target $target 2>&1; idf.py build 2>&1";
    open(my $fh, '-|', $build_cmd) or die "Failed to run build command: $!";
    my @error_patterns = (
        qr/\b(error|warning)\b/i,
        qr/failed to build/i,
        qr/link error/i
    );
    while (my $line = <$fh>) {
        chomp $line;
        if (grep { $line =~ $_ } @error_patterns) {
            print colored($line, 'red'), "\n";
        } 
    }
    close($fh);
}

sub build_target {
    my ($app_dir, $target) = @_;
    chdir($app_dir);
    my $app = $app_dir;
    print "Build for $app_dir $target\n";
    $app =~ s/.*\///;
    `rm -rf $_` for (qw/dependencies.lock build managed_components sdkconfig/);
    filter_build($target);
    my $f = <build/*.elf>;
    if ($f) {
        print colored("Build for $app target $target success\n", 'green');
    } else {
        print colored("Fail to build for $app target $target\n", 'red');
        exit(-1) if ($build_all == 0);
    }
}
